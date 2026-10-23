import "../../../../css/suggestion.css";

function DataDistributor({ data = [], isSuggestion = false }) {
  // isSuggestion이 true일 때만 데이터를 화면에 보여줍니다.
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
  