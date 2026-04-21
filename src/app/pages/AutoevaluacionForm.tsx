import { useState } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { NavLink } from "react-router";

type Answer = "Sí" | "No" | "A veces" | "";

// All question IDs for Planilla 1
const P1_QUESTIONS = [
  { id: "p1_1", label: "1.1", question: "Cumple con las actividades de la asignatura según el respectivo programa presentado y aprobado al comienzo de cada período." },
  { id: "p1_2", label: "1.2", question: "El diario desarrollo de clases está en sintonía con lo planificado." },
  { id: "p1_3", label: "1.3", question: "Efectúa la devolución de las diferentes instancias evaluativas." },
  { id: "p1_4", label: "1.4", question: "Cumple con la ejecución de las actividades teóricas y prácticas de la asignatura de acuerdo a lo presentado y aprobado." },
  { id: "p1_5", label: "1.5", question: "Presenta guías de trabajo práctico, guías de laboratorio y/o guías de estudio actualizada como material de cátedra." },
  { id: "p1_6", label: "1.6", question: "Presenta en tiempo y forma la propuesta de cátedra y el cronograma de acuerdo a la reglamentación vigente." },
  { id: "p1_7", label: "1.7", question: "Supervisa las actividades prácticas realizadas por los auxiliares y/o ayudantes." },
  { id: "p1_8", label: "1.8", question: "Implementa recursos tecnológicos para la mediación pedagógica." },
  { id: "p1_9", label: "1.9", question: "Se capacita permanentemente en su formación pedagógica." },
  { id: "p1_10", label: "1.10", question: "Se capacita permanentemente en su formación profesional." },
  { id: "p1_11", label: "1.11", question: "Ejerce liderazgo y demuestra trabajo en equipo." },
  { id: "p1_12", label: "1.12", question: "Demuestra respeto y responsabilidad con sus colegas." },
  { id: "p1_13", label: "1.13", question: "Atiende las consultas de los alumnos en un ambiente cordial y de respeto." },
  { id: "p1_14", label: "1.14", question: "Cumple con las cuestiones administrativas de cátedra (actas de exámenes, carga de regularidad, control de asistencia de alumnos, entre otros)." },
  { id: "p1_15", label: "1.15", question: "Asume con responsabilidad la evaluación de los procesos de enseñanza y aprendizaje." },
  { id: "p1_16", label: "1.16", question: "Concurre y participa en las reuniones y/o actividades organizadas por la jefatura de carrera." },
  { id: "p1_17", label: "1.17", question: "Incorpora bibliografía actualizada en su programa y solicita la adquisición de compra a realizar por la unidad académica." },
  { id: "p1_18", label: "1.18", question: "Organiza el aula virtual de la asignatura según los lineamientos establecidos." },
];

// All question IDs for Planilla 2
const P2_QUESTIONS = [
  { id: "p2_1", label: "2.1", question: "Cumple con responsabilidad la ejecución de las actividades prácticas de la asignatura estimulando el aprendizaje de los alumnos." },
  { id: "p2_2", label: "2.2", question: "Elabora bajo la supervisión del titular/adjunto las guías de trabajo práctico, guías de laboratorio y/o guías de estudio actualizada como material de cátedra." },
  { id: "p2_3", label: "2.3", question: "Implementa recursos tecnológicos para la mediación pedagógica." },
  { id: "p2_4", label: "2.4", question: "Se capacita permanentemente en su formación pedagógica." },
  { id: "p2_5", label: "2.5", question: "Se capacita permanentemente en su formación profesional." },
  { id: "p2_6", label: "2.6", question: "Asiste a las clases programadas por el profesor a cargo de la asignatura." },
  { id: "p2_7", label: "2.7", question: "Demuestra respeto y responsabilidad con sus colegas." },
  { id: "p2_8", label: "2.8", question: "Ejerce liderazgo y demuestra trabajo en equipo." },
  { id: "p2_9", label: "2.9", question: "Atiende las consultas de los alumnos en un ambiente cordial y de respeto." },
  { id: "p2_10", label: "2.10", question: "Cumple con las cuestiones administrativas de cátedra inherentes al cargo (corrección de trabajos prácticos, preparación del material para las actividades prácticas, entre otros)." },
  { id: "p2_11", label: "2.11", question: "Asume con responsabilidad la evaluación de los procesos de enseñanza y aprendizaje junto al responsable de cátedra." },
  { id: "p2_12", label: "2.12", question: "Concurre y participa en las reuniones y/o actividades organizadas por la jefatura de carrera." },
  { id: "p2_13", label: "2.13", question: "Cumple con lo requerido por el responsable de la cátedra." },
  { id: "p2_14", label: "2.14", question: "Demuestra trabajo en equipo y colaboración con la cátedra." },
  { id: "p2_15", label: "2.15", question: "Utiliza el aula virtual como herramienta de apoyo a la enseñanza." },
  { id: "p2_16", label: "2.16", question: "Incorpora recursos actualizados en las actividades prácticas." },
  { id: "p2_17", label: "2.17", question: "Planifica y organiza las actividades de laboratorio y/o taller bajo la supervisión del responsable." },
];

const ALL_IDS = [...P1_QUESTIONS.map(q => q.id), ...P2_QUESTIONS.map(q => q.id)];

export function AutoevaluacionForm() {
  const [activeSection, setActiveSection] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Single answers map: questionId → Answer
  const [answers, setAnswers] = useState<Record<string, Answer>>(
    Object.fromEntries(ALL_IDS.map(id => [id, ""])) as Record<string, Answer>
  );

  const setAnswer = (id: string, val: Answer) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
  };

  const p1Complete = P1_QUESTIONS.every(q => answers[q.id] !== "");
  const p2Complete = P2_QUESTIONS.every(q => answers[q.id] !== "");
  const allComplete = p1Complete && p2Complete;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allComplete) return;

    let alertas = 0;
    // Count "No" answers in planilla 1 as alerts
    P1_QUESTIONS.forEach(q => {
      if (answers[q.id] === "No") alertas += 1;
    });
    // Count "No" answers in planilla 2 as alerts
    P2_QUESTIONS.forEach(q => {
      if (answers[q.id] === "No") alertas += 1;
    });

    setAlertCount(alertas);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setAlertCount(0);
    setAnswers(Object.fromEntries(ALL_IDS.map(id => [id, ""])) as Record<string, Answer>);
    setActiveSection(1);
  };

  const OptionGroup = ({
    label,
    question,
    id,
  }: {
    label: string;
    question: string;
    id: string;
  }) => (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4 transition-all hover:border-blue-200">
      <p className="font-medium text-slate-800 text-base leading-relaxed">
        <span className="text-blue-700 font-bold mr-2">{label}.</span> {question}
      </p>
      <div className="flex gap-6">
        {(["Sí", "No", "A veces"] as Answer[]).map((opt) => (
          <label key={`${id}-${opt}`} className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                answers[id] === opt ? "border-blue-600" : "border-slate-300 group-hover:border-blue-400"
              }`}
            >
              {answers[id] === opt && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
            </div>
            <input
              type="radio"
              name={id}
              className="sr-only"
              checked={answers[id] === opt}
              onChange={() => setAnswer(id, opt)}
            />
            <span className={`text-slate-600 ${answers[id] === opt ? "font-medium text-slate-900" : ""}`}>
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-100">
        <NavLink to="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
        </NavLink>

        <h2 className="text-3xl font-bold text-slate-900 mb-3">Autoevaluación y Control de Gestión</h2>
        <p className="text-slate-500 text-sm">
          Este formulario se compone de dos planillas obligatorias para el cierre de cuatrimestre y ciclo lectivo, destinadas a Responsables de Cátedra y Docentes.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">¡Evaluación Completada!</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              Gracias por completar las dos planillas de autoevaluación. La información ha sido remitida a la Secretaría Académica.
            </p>
          </div>

          <div className={`p-6 rounded-xl border flex items-start gap-4 ${alertCount > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
            <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${alertCount > 0 ? "text-amber-500" : "text-green-500"}`} />
            <div>
              <h4 className={`font-semibold mb-1 ${alertCount > 0 ? "text-amber-900" : "text-green-900"}`}>
                Resultado del Análisis (Semáforo Institucional)
              </h4>
              <p className={alertCount > 0 ? "text-amber-800" : "text-green-800"}>
                Se han detectado {alertCount} alertas en su reporte de gestión y desempeño.
                {alertCount > 0 && " El área de Secretaría analizará estos puntos de mejora."}
                {alertCount === 0 && " Los indicadores reportados se encuentran en parámetros óptimos."}
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={handleReset}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Realizar nueva evaluación
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Planilla 1 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveSection(1)}
              className="w-full flex items-center justify-between p-6 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-900 text-white text-xs">1</span>
                Evaluación de Desempeño Docente
                {p1Complete && <span className="text-xs text-emerald-600 font-medium ml-2">✓ Completada</span>}
              </h3>
              {activeSection === 1 ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </button>

            {activeSection === 1 && (
              <div className="p-6 space-y-6 animate-in fade-in">
                {P1_QUESTIONS.map(q => (
                  <OptionGroup key={q.id} id={q.id} label={q.label} question={q.question} />
                ))}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveSection(2)}
                    className="text-blue-700 bg-blue-50 px-6 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                  >
                    Continuar a Planilla 2 →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Planilla 2 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveSection(2)}
              className="w-full flex items-center justify-between p-6 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-900 text-white text-xs">2</span>
                Informe Institucional de Control de Gestión
                {p2Complete && <span className="text-xs text-emerald-600 font-medium ml-2">✓ Completada</span>}
              </h3>
              {activeSection === 2 ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </button>

            {activeSection === 2 && (
              <div className="p-6 space-y-6 animate-in fade-in">
                {P2_QUESTIONS.map(q => (
                  <OptionGroup key={q.id} id={q.id} label={q.label} question={q.question} />
                ))}

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveSection(1)}
                    className="text-slate-600 hover:text-slate-800 px-4 py-2 font-medium"
                  >
                    Revisar Planilla 1
                  </button>
                  <button
                    type="submit"
                    disabled={!allComplete}
                    className="bg-blue-900 text-white font-medium py-3 px-8 rounded-xl hover:bg-blue-800 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar Evaluaciones
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
