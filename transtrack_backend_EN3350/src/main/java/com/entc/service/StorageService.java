package com.entc.service;

import com.entc.dao.ImageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface StorageService {
    StoredFile store(MultipartFile file, Long inspectionId, ImageType type) throws IOException;
    Resource load(String storagePath);
    void delete(String storagePath) throws IOException;

    @Data
    @AllArgsConstructor
    class StoredFile {
        private String storagePath;
        private String fileName;
        private String contentType;
        private long size;

        public StoredFile() {} // keep only if you need a no-args ctor (optional)
    }
}