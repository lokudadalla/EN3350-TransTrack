package com.entc.repository;

import com.entc.dao.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface TransformerRepository extends JpaRepository<TransformerDetails, Long>{
	
	//find transformer details by using transformer Id
	TransformerDetails findByTransformerNo(String transformerNo);
	
}


