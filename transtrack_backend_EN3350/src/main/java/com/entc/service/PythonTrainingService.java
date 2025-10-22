package com.entc.service;

import com.entc.model.TrainingSample;
import com.entc.repo.TrainingSampleRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class PythonTrainingService {

    @Value("${py.train.batch-size:50}")
    private int batchSize;

    @Value("${py.train.batch-dir:training_batches}")
    private String batchDir;

    @Value("${py.train.lock:ai_logic/_training.lock}")
    private String lockPath;

    @Value("${py.train.python:python}")
    private String pythonExe;

    @Value("${py.train.module:ai_logic.train}")
    private String trainModule;

    @Value("${py.train.from-weights:ai_logic/best.pt}")
    private String fromWeights;

    @Value("${py.train.out:tf_model/weights/updated_defect/best2.pt}")
    private String outWeights;

    @Value("${app.upload.dir:uploads}")
    private String uploadRoot;

    private final TrainingSampleRepo sampleRepo;
    private final ObjectMapper om = new ObjectMapper();

    public PythonTrainingService(TrainingSampleRepo sampleRepo) {
        this.sampleRepo = sampleRepo;
    }

    /** Buffer one finalized sample (NOT training yet). */
    @Transactional
    public void bufferSample(Long imageId, String imagePath, Object finalAnnotations) {
        var s = new TrainingSample();
        s.setImageId(imageId);
        s.setImagePath(imagePath);
        s.setFinalAcceptedAnnotationsJson(toJson(finalAnnotations));
        s.setSent(false);
        sampleRepo.save(s);

        maybeTriggerBatch();
    }

    /** When >= batchSize, write NDJSON file and spawn the Python trainer (local subprocess). */
    @Transactional
    public void maybeTriggerBatch() {
        long pending = sampleRepo.countBySentFalse();
        if (pending < batchSize) return;

        List<TrainingSample> batch = sampleRepo.findTop50BySentFalseOrderByCreatedAtAsc();

        // 1) ensure output dir
        Path dir = Paths.get(batchDir);
        try { Files.createDirectories(dir); } catch (IOException ignored) {}

        // 2) build NDJSON lines like:
        // {"image_path":"C:/data/img_0001.jpg","boxes":[{"label":"...", "x":..., "y":..., "w":..., "h":...}]}
        String ndjson = buildNdjson(batch);

        // 3) write batch file
        String ts = java.time.ZonedDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        Path batchFile = dir.resolve("train_batch_" + ts + ".ndjson");
        try {
            Files.writeString(batchFile, ndjson, StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            System.err.println("Failed to write batch file: " + e.getMessage());
            return; // keep unsent; will retry next time
        }

        // 4) respect lock like the screenshot
        Path lock = Paths.get(lockPath);
        try {
            if (Files.exists(lock)) {
                System.out.println("Training lock present; skip spawn for now.");
                return;
            }
            Files.createDirectories(lock.getParent());
            Files.writeString(lock, "1", StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            // 5) spawn: python -m ai_logic.train --batch ... --from-weights ... --out ... --lock ...
            List<String> cmd = List.of(
                pythonExe, "-m", trainModule,
                "--batch", batchFile.toString(),
                "--from-weights", fromWeights,
                "--out", outWeights,
                "--lock", lock.toString()
            );

            new ProcessBuilder(cmd)
                .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                .redirectError(ProcessBuilder.Redirect.DISCARD)
                .start();

            // 6) mark sent now (trainer should clear lock when done)
            for (var s : batch) s.setSent(true);
            sampleRepo.saveAll(batch);

            System.out.println("✅ Spawned training with " + batch.size() + " samples: " + batchFile);
        } catch (Exception e) {
            System.err.println("⚠️ Failed to spawn training: " + e.getMessage());
            try { Files.deleteIfExists(lock); } catch (IOException ignored) {}
        }
    }

    // ---------- helpers ----------

    private String buildNdjson(List<TrainingSample> batch) {
        StringBuilder sb = new StringBuilder();
        for (var s : batch) {
            String imagePath = toAbsolutePath(s.getImagePath());

            // final annotations as list of maps
            List<Map<String,Object>> anns = fromJsonList(s.getFinalAcceptedAnnotationsJson());

            // map to trainer boxes: rename width->w, height->h
            List<Map<String,Object>> boxes = new ArrayList<>();
            for (var a : anns) {
                String label = str(a.get("label"));
                Integer x = asInt(a.get("x"));
                Integer y = asInt(a.get("y"));
                Integer w = asInt(a.get("width"));
                Integer h = asInt(a.get("height"));
                if (x == null || y == null || w == null || h == null) continue;

                Map<String,Object> box = new LinkedHashMap<>();
                box.put("label", label == null ? "" : label);
                box.put("x", x);
                box.put("y", y);
                box.put("w", w);
                box.put("h", h);
                boxes.add(box);
            }

            Map<String,Object> line = new LinkedHashMap<>();
            line.put("image_path", imagePath);
            line.put("boxes", boxes);

            try { sb.append(om.writeValueAsString(line)).append("\n"); }
            catch (Exception ex) { System.err.println("Skip sample " + s.getId() + ": " + ex.getMessage()); }
        }
        return sb.toString();
    }

    private String toAbsolutePath(String stored) {
        if (stored == null) return "";
        boolean winAbs = stored.matches("^[A-Za-z]:\\\\.*");
        boolean nixAbs = stored.startsWith("/");
        if (winAbs || nixAbs) return stored;
        return Paths.get(uploadRoot, stored).toAbsolutePath().toString();
    }

    private String toJson(Object o) {
        try { return om.writeValueAsString(o); }
        catch (Exception e) { throw new RuntimeException(e); }
    }

    private List<Map<String,Object>> fromJsonList(String s) {
        try {
            if (s == null || s.isBlank()) return List.of();
            return om.readValue(s, new TypeReference<List<Map<String,Object>>>() {});
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }
    private static Integer asInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}