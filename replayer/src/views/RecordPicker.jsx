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
          text={"Begin writing process analysis."}
        />
      </section>
      <Card className="mx-auto flex min-h-screen max-w-xl flex-col items-center px-6">
        <RecordSearch onRecordLoaded={onRecordLoaded} />
        <FileUpload onRecordLoaded={onRecordLoaded} />
      </Card>
    </>
  );
}
