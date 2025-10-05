package com.entc.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PythonClientConfig {

    @Bean
    WebClient pythonClient(@Value("${py.infer.base:http://localhost:8000}") String base) {
        return WebClient.builder().baseUrl(base).build();
    }
}