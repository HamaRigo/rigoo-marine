package com.rigoomarine.client.repository;

import com.rigoomarine.client.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long>, JpaSpecificationExecutor<Client> {
    Optional<Client> findByEmail(String email);
    Optional<Client> findByPhone(String phone);
    Optional<Client> findByEmailVerificationTokenHash(String tokenHash);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
}
