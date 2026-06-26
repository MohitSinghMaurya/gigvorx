import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus } from "lucide-react";

export default function BriefEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [text, setText] = useState("");

  const handleAdd = () => {
    setQuestions([...questions, { id: Date.now(), text: text || "New question" }]);
    setText("");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <h1 className="text-xl font-bold mb-4">{id === "new" ? "New Brief" : "Edit Brief"}</h1>

      <div className="flex gap-2 mb-6">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type question text..."
          className="bg-[#1a1a1a] border-white/10 text-white"
        />
        <Button onClick={handleAdd} className="bg-[#FF6B00]">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q.id} className="p-3 bg-[#111] border border-white/10 rounded-lg">
            <span className="text-white/50 text-sm mr-2">{i + 1}.</span>
            <span className="text-white">{q.text}</span>
          </div>
        ))}
      </div>

      {questions.length === 0 && (
        <p className="text-white/30 text-sm">No questions yet. Type above and click + to add.</p>
      )}
    </div>
  );
}