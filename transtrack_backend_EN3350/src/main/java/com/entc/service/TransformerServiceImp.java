package com.entc.service;


import com.entc.dao.TransformerDetails;
import com.entc.repository.*;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TransformerServiceImp implements TransformerService{
	
	private final TransformerRepository transformerRepo;
	
	public TransformerServiceImp(TransformerRepository transformerRepo) {
		this.transformerRepo = transformerRepo;
		
	}
	
	@Override
	public TransformerDetails create(TransformerDetails t) {

		return transformerRepo.save(t);
	}

	@Override
	public TransformerDetails getById(Long id) {
		
		return transformerRepo.findById(id).orElseThrow(()-> new RuntimeException("Transfomer not found for the Transfomer No."+ id));
	}

	@Override
	public TransformerDetails getByTransformerNo(String transformerNo) {
		
		TransformerDetails t = transformerRepo.findByTransformerNo(transformerNo);
		if (t == null) throw new RuntimeException("Transformer not found for the Transformer No: " + transformerNo);
        return t;
	}

	@Override
	@Transactional(readOnly = true)
	public List<TransformerDetails> getAll() {
		
		System.out.println("results"+ transformerRepo.findAll());
		return transformerRepo.findAll();
	}
	
	@Override
	public TransformerDetails update(Long id, TransformerDetails body) {
        return transformerRepo.findById(id).map(existing -> {
        	if (body.getPoleNo() != null) {
        		existing.setPoleNo(body.getPoleNo());
        	}
        	if (body.getRegion() != null) {
        		existing.setRegion(body.getRegion());
        	}
        	if (body.getType() != null) {
        		existing.setType(body.getType());
        	}
        	if (body.getLocationDetails() != null) {
        		existing.setLocationDetails(body.getLocationDetails());
        	}
        	if (body.getFavorite() != null) {
        		existing.setFavorite(body.getFavorite() != null ? body.getFavorite() : false);
        	}   
            return transformerRepo.save(existing);
        }).orElse(null);
    }

	@Override
	public void delete(Long id) {
		
		transformerRepo.deleteById(id);
		
	}
	

}
