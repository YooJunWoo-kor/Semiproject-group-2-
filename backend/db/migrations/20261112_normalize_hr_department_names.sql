-- HR 부서명 표준화
-- 기존 department_id와 소속 직원·부서장 관계는 유지하고 이름만 변경합니다.

-- 실행 전 충돌 확인
SELECT department_id, department_name
FROM departments
WHERE department_name IN ('인사팀', '영업팀', '인사부서', '영업부서');

-- 대상 이름의 표준 부서명이 이미 있으면 임의 병합하지 않고 기존 이름을 유지합니다.
UPDATE departments AS old_department
SET old_department.department_name = '인사부서'
WHERE old_department.department_name = '인사팀'
  AND NOT EXISTS (
      SELECT 1
      FROM (
          SELECT department_name
          FROM departments
      ) AS normalized_department
      WHERE normalized_department.department_name = '인사부서'
  );

UPDATE departments AS old_department
SET old_department.department_name = '영업부서'
WHERE old_department.department_name = '영업팀'
  AND NOT EXISTS (
      SELECT 1
      FROM (
          SELECT department_name
          FROM departments
      ) AS normalized_department
      WHERE normalized_department.department_name = '영업부서'
  );

-- 실행 후 충돌 확인
SELECT department_id, department_name
FROM departments
WHERE department_name IN ('인사팀', '영업팀', '인사부서', '영업부서');
