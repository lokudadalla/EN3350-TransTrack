package com.entc.service;

import com.entc.dao.ImageType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class LocalStorageService implements StorageService {

    private final Path root;

    public LocalStorageService(@Value("${app.upload.dir:uploads}") String rootDir) {
        this.root = Paths.get(rootDir).toAbsolutePath().normalize();
    }

    @Override
    public StoredFile store(MultipartFile file, Long inspectionId, ImageType type) throws IOException {
        String original = Objects.requireNonNull(file.getOriginalFilename(), "file name");
        String safeOriginal = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String saveName = UUID.randomUUID() + "-" + safeOriginal;

        Path dir = root.resolve(Paths.get("inspections", inspectionId.toString(), type.name().toLowerCase()));
        Files.createDirectories(dir);

        Path target = dir.resolve(saveName);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        String contentType = Optional.ofNullable(file.getContentType()).orElse("application/octet-stream");

        return new StoredFile(
                target.toString(),   // storagePath (absolute path)
                original,            // fileName (original name for display)
                contentType,
                file.getSize()
        );
    }

    @Override
    public Resource load(String storagePath) {
        return new FileSystemResource(storagePath);
    }

    @Override
    public void delete(String storagePath) throws IOException {
        if (storagePath == null || storagePath.isBlank()) return;
        Files.deleteIfExists(Paths.get(storagePath));
    }
}
