package com.entc.service;


import com.entc.dao.TransformerDetails;
import com.entc.repository.*;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@Transactional
public class TransformerServiceImp implements TransformerService {

    private final TransformerRepository transformerRepo;

    public TransformerServiceImp(TransformerRepository transformerRepo) {
        this.transformerRepo = transformerRepo;
    }

    @Override
    public TransformerDetails create(Long userId, TransformerDetails t) {
        t.setId(null);
        t.setUserId(userId); // stamp owner
        if (transformerRepo.existsByTransformerNoAndUserId(t.getTransformerNo(), userId)) {
            throw new RuntimeException("Transformer number already exists for this user");
        }
        return transformerRepo.save(t);
    }

    @Override
    @Transactional(readOnly = true)
    public TransformerDetails getById(Long userId, Long id) {
        return transformerRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Transformer not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public TransformerDetails getByTransformerNo(Long userId, String transformerNo) {
        return transformerRepo.findByTransformerNoAndUserId(transformerNo, userId)
                .orElseThrow(() -> new RuntimeException("Transformer not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransformerDetails> getAll(Long userId) {
        return transformerRepo.findAllByUserId(userId);
    }

    @Override
    public TransformerDetails update(Long userId, Long id, TransformerDetails body) {
        return transformerRepo.findByIdAndUserId(id, userId)
                .map(existing -> {
                    if (body.getPoleNo() != null) existing.setPoleNo(body.getPoleNo());
                    if (body.getRegion() != null) existing.setRegion(body.getRegion());
                    if (body.getType() != null) existing.setType(body.getType());
                    if (body.getLocationDetails() != null) existing.setLocationDetails(body.getLocationDetails());
                    if (body.getFavorite() != null) existing.setFavorite(body.getFavorite());
                    // transformerNo change? optional: enforce uniqueness per user
                    if (body.getTransformerNo() != null && !body.getTransformerNo().isBlank()
                        && !body.getTransformerNo().equals(existing.getTransformerNo())) {
                        if (transformerRepo.existsByTransformerNoAndUserId(body.getTransformerNo(), userId)) {
                            throw new RuntimeException("Transformer number already exists for this user");
                        }
                        existing.setTransformerNo(body.getTransformerNo());
                    }
                    return transformerRepo.save(existing);
                })
                .orElse(null);
    }

    @Override
    public void delete(Long userId, Long id) {
        transformerRepo.findByIdAndUserId(id, userId)
                .ifPresent(transformerRepo::delete);
    }
}

