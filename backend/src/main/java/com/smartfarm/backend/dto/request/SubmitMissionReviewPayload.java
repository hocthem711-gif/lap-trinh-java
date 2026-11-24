package com.smartfarm.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubmitMissionReviewPayload {
    private String missionId;
    private String reviewDecision; // APPROVED, CONDITIONALLY_APPROVED, REJECTED, NEEDS_REFLIGHT
    private Map<String, Object> rubricScores;
    private String reviewerName;
    private String reviewerRole;
    private String reviewSummaryNote;
    private String correctiveActionPlan;
}
