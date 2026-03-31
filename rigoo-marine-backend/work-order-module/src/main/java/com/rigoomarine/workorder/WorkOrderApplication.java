package com.rigoomarine.workorder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class WorkOrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(WorkOrderApplication.class, args);
    }
}
