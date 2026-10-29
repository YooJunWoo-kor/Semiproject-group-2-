function DataDistributor( props ){

    return(
    <div>
        {props.data.map(
          (item)=>(
            <div>
              <div>아이디 : {item.id}</div>
              <div>내용 : {item.content}</div>
              <div>이름 : {item.name}</div>
            </div>
          )
        )}
      </div>
    )
  }

  export default DataDistributor;
  