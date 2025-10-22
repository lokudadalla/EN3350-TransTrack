package com.entc.service;

import com.entc.dao.InspectionImage;
import com.entc.dao.InspectionImageAnomaly;
import com.entc.model.TrainingSample;
import com.entc.repo.TrainingSampleRepo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Buffers finalized (user-accepted) annotations to DB as simple JSON and
 * periodically writes a NDJSON batch + spawns the Python fine-tuner.
 *
 * NOTE: This class never serializes JPA entities; only flat maps of primitives.
 */
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
    private final ObjectMapper om; // Spring's pre-configured mapper (JavaTime/Hibernate modules)

    public PythonTrainingService(TrainingSampleRepo sampleRepo, ObjectMapper om) {
        this.sampleRepo = sampleRepo;
        this.om = om;
    }

    /**
     * Buffer one finalized sample (does NOT block or fail the caller).
     * We store only a flat list of boxes, never entity graphs.
     */
    @Transactional
    public void bufferSample(InspectionImage img, List<InspectionImageAnomaly> savedRows) {
        try {
            // Build a tiny, flat list like:
            // [{"x":..,"y":..,"width":..,"height":..,"label":"..."}, ...]
            var anns = new ArrayList<Map<String, Object>>();
            for (var a : savedRows) {
                var m = new LinkedHashMap<String, Object>();
                m.put("x", a.getX());
                m.put("y", a.getY());
                m.put("width", a.getWidth());
                m.put("height", a.getHeight());
                m.put("label", a.getLabel() == null ? "" : a.getLabel());
                anns.add(m);
            }

            var s = new TrainingSample();
            s.setImageId(img.getId());
            s.setImagePath(img.getStoragePath());             // relative or absolute; normalized later
            s.setFinalAcceptedAnnotationsJson(toJson(anns));  // safe JSON, no entities inside
            s.setSent(false);
            sampleRepo.save(s);

            // Try to spawn training if threshold reached (never breaks this request)
            maybeTriggerBatch();
        } catch (Exception ignore) {
            // Intentionally swallow/log; annotation save flow must not fail due to training buffer
            // log.warn("bufferSample failed", ignore);
        }
    }

    /**
     * When >= batchSize, write NDJSON file and spawn the Python trainer (local subprocess).
     * Never throws to callers.
     */
    @Transactional
    public void maybeTriggerBatch() {
        long pending = sampleRepo.countBySentFalse();
        if (pending < batchSize) return;

        List<TrainingSample> batch = sampleRepo.findTop50BySentFalseOrderByCreatedAtAsc();

        // 1) ensure output dir
        Path dir = Paths.get(batchDir);
        try { Files.createDirectories(dir); } catch (IOException ignored) {}

        // 2) Build NDJSON lines expected by finetune.py:
        // {"image_path":"...","boxes":[{"label":"...", "x":..., "y":..., "w":..., "h":...}]}
        String ndjson = buildNdjson(batch);

        // 3) write batch file
        String ts = java.time.ZonedDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        Path batchFile = dir.resolve("train_batch_" + ts + ".ndjson");
        try {
            Files.writeString(batchFile, ndjson, StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            System.err.println("Failed to write batch file: " + e.getMessage());
            return; // keep unsent; will retry next time
        }

        // 4) respect lock so only one trainer runs at a time
        Path lock = Paths.get(lockPath);
        try {
            if (Files.exists(lock)) {
                System.out.println("Training lock present; skip spawn for now.");
                return;
            }
            if (lock.getParent() != null) {
                Files.createDirectories(lock.getParent());
            }
            Files.writeString(lock, "1", StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

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

            System.out.println("Training Started with new samples ✅" + batch.size() + " samples: " + batchFile);
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

            // final annotations as list of maps (we stored a flat array)
            List<Map<String, Object>> anns = fromJsonList(s.getFinalAcceptedAnnotationsJson());

            // map to trainer boxes: rename width->w, height->h
            List<Map<String, Object>> boxes = new ArrayList<>();
            for (var a : anns) {
                String label = str(a.get("label"));
                Integer x = asInt(a.get("x"));
                Integer y = asInt(a.get("y"));
                Integer w = asInt(a.get("width"));
                Integer h = asInt(a.get("height"));
                if (x == null || y == null || w == null || h == null) continue;

                Map<String, Object> box = new LinkedHashMap<>();
                box.put("label", label == null ? "" : label);
                box.put("x", x);
                box.put("y", y);
                box.put("w", w);
                box.put("h", h);
                boxes.add(box);
            }

            Map<String, Object> line = new LinkedHashMap<>();
            line.put("image_path", imagePath);
            line.put("boxes", boxes);

            try {
                sb.append(om.writeValueAsString(line)).append("\n");
            } catch (Exception ex) {
                System.err.println("Skip sample " + s.getId() + ": " + ex.getMessage());
            }
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
        catch (Exception e) { return "[]"; } // never throw from buffering path
    }

    private List<Map<String, Object>> fromJsonList(String s) {
        try {
            if (s == null || s.isBlank()) return List.of();
            return om.readValue(s, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of(); // be forgiving
        }
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }
    private static Integer asInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}