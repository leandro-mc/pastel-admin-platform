import { PageHeader, Tab, TabList, TabPanel, Tabs } from "@/core/ui";
import { useBank } from "../api/hooks";
import { Loaded } from "../components/Form";
import {
  CertificationSection,
  EducationSection,
  ExperienceSection,
  LanguageSection,
  NotesSection,
  ProjectSection,
  SkillSection,
} from "../components/BankSections";
import { strings } from "../strings";

const tabs = strings.bank.tabs;

export function Component() {
  const bank = useBank();
  return (
    <div
      data-module="huella"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title={strings.bank.title}
        description={strings.bank.description}
      />
      <Loaded query={bank}>
        {(data) => (
          <Tabs>
            <TabList aria-label={strings.bank.title}>
              <Tab id="notes">{tabs.notes}</Tab>
              <Tab id="experiences">{tabs.experiences}</Tab>
              <Tab id="projects">{tabs.projects}</Tab>
              <Tab id="skills">{tabs.skills}</Tab>
              <Tab id="education">{tabs.education}</Tab>
              <Tab id="certifications">{tabs.certifications}</Tab>
              <Tab id="languages">{tabs.languages}</Tab>
            </TabList>
            <TabPanel id="notes">
              <NotesSection notes={data.notes} />
            </TabPanel>
            <TabPanel id="experiences">
              <ExperienceSection bank={data} />
            </TabPanel>
            <TabPanel id="projects">
              <ProjectSection bank={data} />
            </TabPanel>
            <TabPanel id="skills">
              <SkillSection bank={data} />
            </TabPanel>
            <TabPanel id="education">
              <EducationSection bank={data} />
            </TabPanel>
            <TabPanel id="certifications">
              <CertificationSection bank={data} />
            </TabPanel>
            <TabPanel id="languages">
              <LanguageSection bank={data} />
            </TabPanel>
          </Tabs>
        )}
      </Loaded>
    </div>
  );
}
