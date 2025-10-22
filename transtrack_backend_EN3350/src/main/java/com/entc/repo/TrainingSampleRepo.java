// src/main/java/com/entc/repo/TrainingSampleRepo.java
package com.entc.repo;

import com.entc.model.TrainingSample;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrainingSampleRepo extends JpaRepository<TrainingSample, Long> {
    long countBySentFalse();
    List<TrainingSample> findTop50BySentFalseOrderByCreatedAtAsc();
}