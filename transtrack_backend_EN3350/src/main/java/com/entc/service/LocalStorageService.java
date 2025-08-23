package com.entc.service;

import com.entc.model.ImageType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

// src/main/java/com/entc/service/storage/LocalStorageService.java
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

        Path dir = root.resolve(Paths.get("inspections", inspectionId.toString(), type.name()));
        Files.createDirectories(dir);

        Path target = dir.resolve(saveName);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        String ctype = Optional.ofNullable(file.getContentType()).orElse("application/octet-stream");
        return new StoredFile(target.toString(), original, ctype, file.getSize());
    }

    @Override
    public Resource load(String storagePath) {
        return new FileSystemResource(storagePath);
    }

    @Override
    public void delete(String storagePath) throws IOException {
        Files.deleteIfExists(Paths.get(storagePath));
    }
}

