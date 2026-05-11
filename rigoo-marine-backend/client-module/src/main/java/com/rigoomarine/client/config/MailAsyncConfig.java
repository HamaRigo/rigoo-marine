package com.rigoomarine.client.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Bounded executor for {@code @Async} email dispatch. Sized for current load
 * (~5 emails/sec peak, room for 50/sec).
 *
 * <p>{@code CallerRunsPolicy} is the load-shedding strategy: if the queue
 * fills, the calling thread (the HTTP request thread) runs the send inline.
 * This degrades performance but never loses an email — the alternative
 * ({@code AbortPolicy}) would surface a 500 to the user.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class MailAsyncConfig {

    @Bean(name = "mailTaskExecutor")
    public Executor mailTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(2);
        exec.setMaxPoolSize(8);
        exec.setQueueCapacity(100);
        exec.setThreadNamePrefix("mail-");
        exec.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        exec.initialize();
        return exec;
    }
}
