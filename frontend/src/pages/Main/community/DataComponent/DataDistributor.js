<<<<<<< HEAD
import "../../../../css/suggestion.css";

function DataDistributor({ data = [], isSuggestion = false }) {
  if (!isSuggestion) {
    return null;
  }

  return (
    <div className="suggestion-list">
      {data.map((item) => (
        <div className="suggestion-card" key={item.id}>
          <div>아이디 : {item.id}</div>
          <div>내용 : {item.content}</div>
          <div>이름 : {item.name}</div>
        </div>
      ))}
    </div>
  );
}

export default DataDistributor;
=======
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
  
>>>>>>> dc756df83a6fb7de274b5334c8eba37dfa55c2f2
