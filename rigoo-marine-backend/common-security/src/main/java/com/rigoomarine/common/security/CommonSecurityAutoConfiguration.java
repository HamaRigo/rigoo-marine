package com.rigoomarine.common.security;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Auto-registers the shared security beans for any service that adds
 * {@code common-security} to its dependencies. The corresponding
 * {@code META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports}
 * file activates this class at Spring Boot startup.
 */
@AutoConfiguration
@ConditionalOnClass(StringRedisTemplate.class)
public class CommonSecurityAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public TokenRevocationCheck tokenRevocationCheck(
            ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        return new TokenRevocationCheck(redisTemplateProvider);
    }
}
