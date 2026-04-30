import Title from "../components/Title";
import CaptionText from "../components/CaptionText";
import RecordSearch from "../components/RecordSearch";
import FileUpload from "../components/FileUpload";
import { Card } from "../components/ui/card";

export default function RecordPicker({ onRecordLoaded }) {
  return (
    <>
      <section className="flex flex-col items-center">
        <Title className="mt-8" />
        <CaptionText
          className="p-5 justify-center"
          text={"Search or upload a record to begin writing process analysis."}
        />
      </section>
      <Card className="mx-auto flex w-full max-w-2xl flex-col px-6">
        <RecordSearch onRecordLoaded={onRecordLoaded} />
        <FileUpload onRecordLoaded={onRecordLoaded} className="mt-2" />
      </Card>
    </>
  );
}
