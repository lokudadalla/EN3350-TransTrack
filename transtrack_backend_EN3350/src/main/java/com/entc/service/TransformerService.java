package com.entc.service;

import com.entc.dao.TransformerDetails;
import java.util.List;

public interface TransformerService {
    TransformerDetails create(Long userId, TransformerDetails t);
    TransformerDetails getById(Long userId, Long id);
    TransformerDetails getByTransformerNo(Long userId, String transformerNo);
    List<TransformerDetails> getAll(Long userId);
    TransformerDetails update(Long userId, Long id, TransformerDetails body);
    void delete(Long userId, Long id);
}
