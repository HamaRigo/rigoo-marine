package com.rigoomarine.client.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Bounded executor for {@code @Async} email dispatch.
 *
 * <p>Sizing rationale:
 * <ul>
 *   <li>core=4 handles normal steady-state traffic without spinning up extras.</li>
 *   <li>max=16 absorbs short bursts (registration campaigns, bulk password resets).</li>
 *   <li>queue=500 means the pool must be fully saturated and 500 tasks backed up
 *       before the rejection policy ever fires — that covers ≈ 30 s of peak load
 *       at 17 tasks/s without touching HTTP threads.</li>
 * </ul>
 *
 * <p>{@code CallerRunsPolicy} is the last-resort shed valve: if the queue fills
 * (which requires the pool to be at max AND 500 tasks backed up simultaneously),
 * the HTTP thread runs the send inline.  That is still preferable to
 * {@code AbortPolicy} (which would lose the email entirely — the async path has
 * no outbox write on rejection) and the scenario is astronomically unlikely given
 * the queue depth.  If it ever fires, the WARN log in {@link RedisConfig}'s cache
 * error handler is a leading indicator that something is wrong upstream.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class MailAsyncConfig {

    @Bean(name = "mailTaskExecutor")
    public Executor mailTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(4);
        exec.setMaxPoolSize(16);
        exec.setQueueCapacity(500);
        exec.setThreadNamePrefix("mail-");
        exec.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        exec.initialize();
        return exec;
    }
}
