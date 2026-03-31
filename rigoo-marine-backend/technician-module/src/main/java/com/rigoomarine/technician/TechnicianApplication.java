package com.rigoomarine.technician;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class TechnicianApplication {
    public static void main(String[] args) {
        SpringApplication.run(TechnicianApplication.class, args);
    }
}
