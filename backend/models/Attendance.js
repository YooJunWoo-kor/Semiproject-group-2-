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
          VALUES (?, CURDATE(), NOW(),	CURDATE(), '근무중', null)
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
            attendance_status = '정상'
          where 
            employee_id = ?
            and work_date = CURDATE()
        `;
        db.query(query,[employee_id],(err, results)=>{
          if(err){
            console.log("적용실패");
            return reject(err);
          }
          else{
            console.log("퇴근처리 완료");
            return resolve(results);
          }
        })
      });
    }
}

module.exports = Attendance;