const db = require('../db');

class Attendance{
    static getData(employee_id){
        //resolve: 결과값, reject: 에러
        return new Promise((resolve, reject)=>{
            const query = `
            select
                att.work_date as 'date'
                ,att.check_in_at as 'start'
                ,att.check_out_at as 'end'
                ,att.attendance_status as 'title'
            from employees e
            inner join attendance att on e.employee_id = att.employee_id
            where e.employee_id = ?`
            
            db.query(query, [employee_id], (err, results)=>{
              if(err){
                    return reject(err);
              }
              else{
                resolve(results)
              }
            })
        })
    };

    static setNewDate(employee_id){
      return new Promise((resolve,reject)=>{
        const query=`
          insert into attendance (employee_id, work_date, check_in_at, check_out_at, attendance_status, memo)
          VALUES (?, CURDATE(), NOW(),	null, '근무중', null)
        `;
        db.query(query,[employee_id],(err, results)=>{
          if(err){
            return reject(err);
          }
          else{
            return resolve(results);
          }
        })
      });
    }

    static updateDate(employee_id){
      return new Promise((resolve,reject)=>{
        const query=`
          update attendance
          set
            check_out_at = now(),
            attendance_status = CASE
            WHEN TIME(check_in_at) > '09:00:00' 
            AND TIME(NOW()) < '18:00:00'
            THEN '지각·조퇴'
            
            WHEN TIME(check_in_at) > '09:00:00'
            THEN '지각'

            WHEN TIME(NOW()) < '18:00:00'
            THEN '조퇴'
            
            ELSE '정상'
            END
          where 
            employee_id = ?
            AND work_date = CURDATE()
            AND check_in_at IS NOT NULL
            AND check_out_at IS NULL
        `;
        db.query(query,[employee_id],(err, results)=>{
          if(err){
            console.log("적용실패");
            return reject(err);
          }
          else{
            if(results.affectedRows === 0){
              return reject(new Error("퇴근 가능한 출근 기록이 없습니다"));
            }

            console.log("퇴근처리 완료");
            return resolve(results);
          }
        })
      });
    }

    static getAttendanceSummary(employee_id){
      return new Promise((resolve, reject) => {
        const query = `
          SELECT
            COUNT(CASE
              WHEN TIME(check_in_at) > '09:00:00' THEN 1
            END) AS lateCount,
            COUNT(CASE
              WHEN TIME(check_out_at) >= '19:00:00' THEN 1
            END) AS overtimeCount,
            COALESCE(
              SUM(TIMESTAMPDIFF(MINUTE, check_in_at, check_out_at)),
              0
            ) AS workingMinutes
          FROM attendance
          WHERE employee_id = ?
        `;
        db.query(query, [employee_id], (err, results) => {
          if (err) return reject(err);
          resolve(results[0]);
        });
      });
    }
}



module.exports = Attendance;