import React, { useState } from 'react';
import { X, Info, Palette } from 'lucide-react';
import {
  Button,
  Card,
  Pill,
  Field,
  Select,
  Checkbox,
  ListRow,
  StateBox,
  ProgressRing,
  Notice,
  MilestoneCard,
  EmptyState,
} from './ui';
import { AssigneeAvatar } from './AssigneeAvatar';
import {
  IconGroupe,
  IconBinome,
  IconSeanceEncadree,
  IconJalon,
  IconRendu,
  IconCarnet,
  IconTrace,
  IconSource,
  IconEntretien,
  IconImpression,
  IconVariation,
} from './icons';

interface LegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegendModal: React.FC<LegendModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'aide' | 'charte'>('aide');
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [fieldVal, setFieldVal] = useState('prototypage');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--riso-ink)]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[16px] max-w-3xl w-full border-2 border-[var(--riso-ink)] shadow-riso max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[var(--riso-ink)]">
        {/* Entête avec onglets Aide / Charte */}
        <div className="flex items-center justify-between px-6 py-3 border-b-2 border-[var(--riso-ink)] bg-[var(--riso-paper)] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('aide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[999px] text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'aide'
                  ? 'bg-[var(--riso-ink)] text-white shadow-riso-press'
                  : 'text-[var(--riso-ink-secondary)] hover:text-[var(--riso-ink)]'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Aide</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('charte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[999px] text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'charte'
                  ? 'bg-[var(--riso-ink)] text-white shadow-riso-press'
                  : 'text-[var(--riso-ink-secondary)] hover:text-[var(--riso-ink)]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Charte & Composants UI</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--riso-ink-secondary)] hover:text-[var(--riso-ink)] rounded-[8px] hover:bg-[var(--riso-p1-tint)]/40 transition-colors border border-transparent hover:border-[var(--riso-ink)] cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeTab === 'aide' ? (
          <div className="p-6 space-y-6 flex-1 overflow-y-auto text-[13px] text-[var(--riso-ink)] leading-relaxed bg-[var(--riso-paper)]">
            <div>
              <h3 className="font-bold text-sm text-[var(--riso-ink)] font-heading mb-1.5">
                Ton projet en 3 phases
              </h3>
              <p className="text-[var(--riso-ink-secondary)]">
                Exploration, Idéation, Finalisation. Tu peux les renommer, en ajouter ou en retirer dans Vue détaillée › Phases. Chaque phase a sa couleur, ses tâches et ses livrables.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[var(--riso-ink)] font-heading mb-1.5">
                Aujourd'hui
              </h3>
              <p className="text-[var(--riso-ink-secondary)]">
                Ce que tu as à faire maintenant, les jours avant ton prochain rendu et tes sessions de la semaine.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[var(--riso-ink)] font-heading mb-1.5">
                Parcours
              </h3>
              <p className="text-[var(--riso-ink-secondary)]">
                Tes phases dans l'ordre. Clique sur une phase pour voir son objectif, son livrable attendu et ses tâches. Le crayon permet de les modifier.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[var(--riso-ink)] font-heading mb-1.5">
                Sessions
              </h3>
              <p className="text-[var(--riso-ink-secondary)]">
                Ton agenda de travail. « Nouvelle session » : choisis le type (Solo, Groupe, Tuteur), la date, la durée et la phase.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[var(--riso-ink)] font-heading mb-1.5">
                Journal
              </h3>
              <p className="text-[var(--riso-ink-secondary)]">
                Tes traces d'atelier : ce que tu as fait, ce que tu constates, ce que tu décides. Ajoute photos, liens et fichiers. « Exporter » crée une version imprimable.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm text-[var(--riso-ink)] font-heading mb-1.5">
                Vue détaillée
              </h3>
              <p className="text-[var(--riso-ink-secondary)]">
                Synthèse, Planning, Sessions, Tâches, Livrables, Phases, Réglages : tout le projet en tableaux, modifiables au clic.
              </p>
            </div>
          </div>
        ) : (
          /* Onglet Charte : Vérification visuelle complète des fondations */
          <div className="p-6 space-y-8 flex-1 overflow-y-auto text-xs text-[var(--riso-ink)] leading-relaxed bg-[var(--riso-paper)]">
            {/* 1. Boutons */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">1. Boutons (Button)</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">▶ commencer</Button>
                <Button variant="secondary">autre tâche</Button>
                <Button variant="ghost">annuler</Button>
                <Button variant="danger">supprimer</Button>
                <Button variant="secondary" disabled>désactivé</Button>
              </div>
            </div>

            {/* 2. Cartes */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">2. Cartes (Card)</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card variant="default">
                  <h4 className="font-bold font-heading lowercase text-sm">carte par défaut</h4>
                  <p className="t-small mt-1">fond blanc, contour 2px encre, ombre nette 0 4px 0 encre.</p>
                </Card>
                <Card variant="highlight" tint="p4">
                  <h4 className="font-bold font-heading lowercase text-sm">carte mise en avant</h4>
                  <p className="t-small mt-1">fond teinte de phase rose, ombre jaune 4px 4px 0.</p>
                </Card>
                <Card variant="flat">
                  <h4 className="font-bold font-heading lowercase text-sm">carte plate info</h4>
                  <p className="t-small mt-1">contour 2px, sans ombre portée.</p>
                </Card>
              </div>
            </div>

            {/* 3. Pills / Badges */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">3. Pastilles (Pill)</span>
              <div className="flex flex-wrap items-center gap-2">
                <Pill dotColor="var(--riso-p4)">prototypage</Pill>
                <Pill>30 min</Pill>
                <Pill>#ralentir</Pill>
                <Pill dotColor="var(--riso-p3)">solo</Pill>
                <Pill variant="danger">échéance passée</Pill>
              </div>
            </div>

            {/* 4. Champs & Sélecteurs */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">4. Champs (Field & Select)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <Select
                  label="Phase du projet"
                  value={fieldVal}
                  onChange={(e) => setFieldVal(e.target.value)}
                >
                  <option value="exploration">1 exploration</option>
                  <option value="cadrage">2 cadrage</option>
                  <option value="ideation">3 idéation</option>
                  <option value="prototypage">4 prototypage</option>
                  <option value="recule">5 prise de recul</option>
                  <option value="rendu">6 rendu</option>
                </Select>
                <Field
                  label="Durée de travail"
                  defaultValue="25"
                  helper="multiple de 5 min"
                />
              </div>
            </div>

            {/* 5. Checkbox ronde & ListRow */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">5. Checkbox & Ligne de liste</span>
              <div className="bg-white rounded-[8px] border-2 border-[var(--riso-ink)] overflow-hidden">
                <ListRow>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={checkboxVal} onChange={setCheckboxVal} />
                    <span className="font-bold font-heading lowercase text-sm">maquetter le volume physique</span>
                  </div>
                  <span className="t-small tabular-nums font-bold">2/3</span>
                </ListRow>
                <ListRow>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={true} onChange={() => {}} />
                    <span className="font-bold font-heading lowercase text-sm line-through text-[var(--riso-ink-secondary)]">sélectionner le concept</span>
                  </div>
                  <span className="t-small tabular-nums font-bold">fait</span>
                </ListRow>
              </div>
            </div>

            {/* 6. États par la forme (StateBox) */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">6. États par la forme (StateBox)</span>
              <div className="space-y-2">
                <StateBox state="done" label="fait" />
                <StateBox state="late" label="en retard" />
                <StateBox state="upcoming" label="à venir" />
              </div>
            </div>

            {/* 7. Progression, Jalon, Notification, État vide */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">7. Progression & Notifications</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="bg-white border-2 border-[var(--riso-ink)] rounded-[8px] p-4 flex items-center gap-4 shadow-riso">
                  <ProgressRing outerFraction={5 / 11} innerFraction={10.75 / 28} />
                  <div>
                    <h4 className="font-bold font-heading text-sm text-[var(--riso-ink)]">5 / 11 tâches</h4>
                    <p className="text-xs text-[var(--riso-ink-secondary)] mt-0.5">10,75 h sur 28 h</p>
                    <p className="text-[11px] font-bold text-[var(--riso-ink-secondary)] mt-1">J-25 · rendu le 3 nov.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <MilestoneCard
                    title="gel du prototype"
                    subtitle="dim. 26 oct. · dans 17 jours"
                  />
                  <Notice
                    message="tâche terminée !"
                    actionText="ajouter une trace"
                  />
                </div>
              </div>
            </div>

            {/* 8. État vide */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">8. État vide (EmptyState)</span>
              <EmptyState message="ton carnet est vide" />
            </div>

            {/* 9. Avatars & Pictos */}
            <div className="space-y-3">
              <span className="t-label block text-[var(--riso-ink-secondary)]">9. Avatars & Pictothèque</span>
              <div className="flex flex-wrap items-center gap-3 p-3 bg-white border-2 border-[var(--riso-ink)] rounded-[8px]">
                <AssigneeAvatar assignee="Tous" size={28} />
                <AssigneeAvatar assignee="Lilou" size={28} />
                <AssigneeAvatar assignee="Agathe" size={28} />
                <AssigneeAvatar assignee="Catherine" size={28} />
                <AssigneeAvatar assignee="Marine" size={28} />
              </div>

              <div className="flex flex-wrap items-center gap-4 p-3 bg-white border-2 border-[var(--riso-ink)] rounded-[8px] text-[var(--riso-ink)]">
                <IconGroupe size={24} title="groupe" />
                <IconBinome size={24} title="binôme" />
                <IconSeanceEncadree size={24} title="séance encadrée" />
                <IconJalon size={24} title="jalon" />
                <IconRendu size={24} title="rendu" />
                <IconCarnet size={24} title="carnet" />
                <IconTrace size={24} title="trace" />
                <IconSource size={24} title="source" />
                <IconEntretien size={24} title="entretien" />
                <IconImpression size={24} title="impression" />
                <IconVariation size={24} title="variation" />
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 bg-[var(--riso-paper)] border-t-2 border-[var(--riso-ink)] flex justify-end shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};

