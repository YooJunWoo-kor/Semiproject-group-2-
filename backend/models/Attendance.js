const db = require('../db');

class Attendance{
    static getData(employNum){
        //resolve: 결과값, reject: 에러
        return new Promise((resolve, reject)=>{
            const query = `
            select
                att.work_date as 'date'
                ,att.check_in_at as 'start'
                ,att.check_out_at as 'end'
            from employees e
            inner join attendance att on e.employee_id = att.employee_id
            where e.employee_number = ?`
            
            db.query(query, [employNum], (err, results)=>{
              if(err){
                    return reject(err);
              }
              else{
                resolve(results)
              }
            })
        })
    };
}