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
<<<<<<< HEAD
        private String storagePath, fileName, contentType; 
        private long size;
        
        
        public StoredFile() {}

        public StoredFile(String storagePath, String fileName, String contentType, long size) {
            this.storagePath = storagePath;
            this.fileName = fileName;
            this.contentType = contentType;
            this.size = size;
        }
        
        
		public String getStoragePath() {
			return storagePath;
		}
		public void setStoragePath(String storagePath) {
			this.storagePath = storagePath;
		}
		public String getFileName() {
			return fileName;
		}
		public void setFileName(String fileName) {
			this.fileName = fileName;
		}
		public String getContentType() {
			return contentType;
		}
		public void setContentType(String contentType) {
			this.contentType = contentType;
		}
		public long getSize() {
			return size;
		}
		public void setSize(long size) {
			this.size = size;
		}
=======
        private String storagePath;
        private String fileName;
        private String contentType;
        private long size;

        public StoredFile() {} // keep only if you need a no-args ctor (optional)
>>>>>>> sasindu_frontend
    }
}