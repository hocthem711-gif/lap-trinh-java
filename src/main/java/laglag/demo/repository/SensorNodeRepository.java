package laglag.demo.repository;

import laglag.demo.entity.SensorNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SensorNodeRepository extends JpaRepository<SensorNode, Long> {
}