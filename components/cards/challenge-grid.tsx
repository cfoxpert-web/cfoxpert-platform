import { BUSINESS_CHALLENGES } from "@/constants/challenges";

export function ChallengeGrid() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {BUSINESS_CHALLENGES.map((challenge) => (
        <div
          key={challenge.title}
          className="bg-white p-7 transition-colors duration-250 hover:bg-mist-2"
        >
          <h3 className="mb-2 text-base font-semibold text-navy">{challenge.title}</h3>
          <p className="text-sm text-slate">{challenge.description}</p>
        </div>
      ))}
    </div>
  );
}
