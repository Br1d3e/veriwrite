import Title from "../components/Title";
import SearchBar from "../components/SearchBar";
import FileUpload from "../components/FileUpload";

export default function RecordPicker({ onRecordLoaded }) {
  return (
    <>
      <Title />
      <SearchBar onRecordLoaded={onRecordLoaded} />
      <FileUpload onRecordLoaded={onRecordLoaded} />
    </>
  );
}
