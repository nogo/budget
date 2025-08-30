import { Template } from "~/service/templates.api";
import TemplateListItem, { TemplateNoItem } from "./template-list-item";
import { NotepadTextDashed } from "lucide-react";
import { useTranslation } from "~/locales/translations";
import React from "react";

interface Props {
  templates: Array<Template>;
  selectedTemplateId?: string;
}

interface GroupedTemplates {
  [categoy: string]: Array<Template>;
}

const TemplateList: React.FC<Props> = ({ templates, selectedTemplateId }) => {
  const t = useTranslation("templates");
  const groupedTemplate: GroupedTemplates = templates.reduce(
    (acc, template) => {
      const category = template.category ? template.category : "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as GroupedTemplates,
  );

  return (
    <>
      <div className="mb-4 md:flex-[1_2_20%] relative overflow-auto">
        <div className="grid grid-cols-1 border border-gray-300 shadow-md">
          <h1 className="p-2 text-center font-bold flex justify-center">
            <NotepadTextDashed />
            {t("templates")}
          </h1>
          {templates.length === 0 && <TemplateNoItem />}

          {Object.keys(groupedTemplate).map((category) => (
            <React.Fragment key={category}>
              <h2 className="flex items-end justify-between border-b border-gray-300 px-3 py-2 font-semibold">
                {category}
              </h2>
              {groupedTemplate[category].map((template) => (
                <TemplateListItem
                  key={template.id}
                  template={template}
                  selected={template.id.toString() === selectedTemplateId}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

export default TemplateList;
