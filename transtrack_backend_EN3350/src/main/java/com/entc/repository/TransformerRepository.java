package com.entc.repository;

import com.entc.dao.*;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface TransformerRepository extends JpaRepository<TransformerDetails, Long> {

    // user-scoped lookups
    List<TransformerDetails> findAllByUserId(Long userId);

    Optional<TransformerDetails> findByIdAndUserId(Long id, Long userId);

    Optional<TransformerDetails> findByTransformerNoAndUserId(String transformerNo, Long userId);

    boolean existsByTransformerNoAndUserId(String transformerNo, Long userId);
}

