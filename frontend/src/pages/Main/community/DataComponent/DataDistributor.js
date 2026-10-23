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