package laglag.demo.repository;

import laglag.demo.entity.Uav;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UavRepository extends JpaRepository<Uav, Long> {
    // Bổ sung thêm dòng này
    Optional<Uav> findByCode(String code);
}