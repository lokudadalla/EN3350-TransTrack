//package com.entc;
//
//import org.springframework.boot.SpringApplication;
//import org.springframework.boot.autoconfigure.SpringBootApplication;
//
//@SpringBootApplication
//public class TranstrackBackendApplication {
//
//	public static void main(String[] args) {
//		SpringApplication.run(TranstrackBackendApplication.class, args);
//	}
//
//}



package com.entc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class TranstrackBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TranstrackBackendApplication.class, args);
    }

    @GetMapping("/")
    public String home() {
        return "Backend is running! what is your name?";
    }
}
