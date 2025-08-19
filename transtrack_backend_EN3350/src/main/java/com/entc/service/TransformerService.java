package com.entc.service;

import com.entc.dao.TransformerDetails;
import java.util.List;

public interface TransformerService {
    TransformerDetails create(TransformerDetails t);
    TransformerDetails getById(Long id);
    TransformerDetails getByTransformerNo(String transformerNo);
    List<TransformerDetails> getAll();
    void delete(Long id);
}