package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.MissionNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MissionNoteRepository extends JpaRepository<MissionNote, Long> {
    List<MissionNote> findByMissionIdOrderByCreatedAtDesc(Long missionId);
    List<MissionNote> findAllByOrderByCreatedAtDesc();
}
