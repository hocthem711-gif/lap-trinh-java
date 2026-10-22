package laglag.demo.repository;
import laglag.demo.entity.Uav;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UavRepository extends JpaRepository<Uav, Long> {
}