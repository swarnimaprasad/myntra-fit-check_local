import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebaseConfig";

const CrewJoin: React.FC = () => {
  const { crewId } = useParams<{ crewId: string }>();
  const [crewData, setCrewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!crewId) return;
    const crewRef = ref(db, `crews/${crewId}`);
    const unsubscribe = onValue(crewRef, (snapshot) => {
      setCrewData(snapshot.val());
      setLoading(false);
    });
    return () => unsubscribe();
  }, [crewId]);

  if (loading) return <div className="p-8 text-center">Loading crew...</div>;
  if (!crewData) return <div className="p-8 text-center text-red-600">Crew not found.</div>;

  return (
    <div className="p-8 max-w-lg mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-2 text-primary-700">Welcome to {crewData.name}'s Crew!</h2>
      <p className="mb-4 text-gray-700">Event Vibe: {crewData.vibe}</p>
      {/* Add more UI to show crew details, allow joining, or sync outfit selections here */}
      <div className="mt-6 text-green-700 font-semibold">You are viewing the shared crew session.</div>
    </div>
  );
};

export default CrewJoin;