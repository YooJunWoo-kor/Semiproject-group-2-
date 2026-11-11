-- 기안서 종류별 세부정보 저장 컬럼
-- 이 SQL은 최초 한 번만 실행하세요.
-- 실행 전 확인: SHOW COLUMNS FROM my_draft LIKE 'detail_data';
-- 컬럼이 이미 있다면 아래 ALTER TABLE은 실행하지 마세요.
ALTER TABLE my_draft ADD COLUMN detail_data JSON NULL;
