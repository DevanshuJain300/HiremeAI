function CandidateCard({ candidate }) {
  return (
    <div className="glass overflow-hidden rounded-3xl border border-indigo-400/20 shadow-2xl shadow-black/20">

      {/* HEADER */}
      <div className="border-b border-indigo-400/10 bg-indigo-950/20 px-6 py-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-[26px] font-bold text-indigo-100">
              {candidate.name}
            </h2>

            <p className="mt-1 text-base text-slate-300">
              Candidate Profile
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300">

            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            Profile Loaded

          </div>

        </div>

      </div>

      {/* BASIC INFORMATION */}
      <div className="grid gap-4 border-b border-indigo-400/10 px-6 py-5 sm:grid-cols-3">

        <div>
          <p className="text-xs uppercase tracking-wider text-blue-300/60">
            Email
          </p>

          <p className="mt-1 break-all text-sm text-slate-200">
            {candidate.email}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-blue-300/60">
            Phone
          </p>

          <p className="mt-1 text-sm text-slate-200">
            {candidate.phone}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-blue-300/60">
            Experience
          </p>

          <p className="mt-1 text-sm text-slate-200">
            {candidate.experience}
          </p>
        </div>

      </div>

      {/* SKILLS */}
      {candidate.skills?.length > 0 && (
        <div className="border-b border-indigo-400/10 px-6 py-5">

          <h3 className="section-heading mb-3">
            Skills
          </h3>

          <div className="flex flex-wrap gap-2">

            {candidate.skills.map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-200"
              >
                {skill}
              </span>
            ))}

          </div>

        </div>
      )}

      {/* EXPERIENCE */}
      {candidate.experience_details?.length > 0 && (
        <div className="border-b border-indigo-400/10 px-6 py-5">

          <h3 className="section-heading mb-4">
            Experience
          </h3>

          <div className="space-y-5">

            {candidate.experience_details.map((experience, index) => (

              <div
                key={index}
                className="rounded-2xl border border-indigo-400/10 bg-indigo-950/20 p-4"
              >

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                  <h4 className="text-base font-semibold text-indigo-100">
                    {experience.role}
                  </h4>

                  <span className="text-sm text-slate-400">
                    {experience.duration}
                  </span>

                </div>

                <p className="mt-1 text-sm font-medium text-emerald-300">
                  {experience.company}
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {experience.description}
                </p>

              </div>

            ))}

          </div>

        </div>
      )}

      {/* EDUCATION */}
      {candidate.education && (
        <div className="px-6 py-5">

          <h3 className="section-heading mb-3">
            Education
          </h3>

          <div className="rounded-2xl border border-indigo-400/10 bg-indigo-950/20 p-4">

            <p className="text-sm text-slate-200">
              {candidate.education}
            </p>

          </div>

        </div>
      )}

    </div>
  );
}

export default CandidateCard;