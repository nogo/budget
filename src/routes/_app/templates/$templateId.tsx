import {
  ErrorComponent,
  ErrorComponentProps,
  createFileRoute,
} from "@tanstack/react-router";
import { NotFound } from "~/components/NotFound";
import { templateQueries } from "~/service/queries";
import { useTranslation } from "~/locales/translations";
import TemplateEditForm from "~/components/templates/TemplateEditForm";
import TemplateList from "~/components/templates/TemplateList";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/templates/$templateId")({
  component: RouteComponent,
  loader: async ({ params: { templateId }, context }) => {
    return Promise.all([
      await context.queryClient.ensureQueryData(templateQueries.list()),
      await context.queryClient.ensureQueryData(
        templateQueries.detail(templateId),
      ),
    ]);
  },
  notFoundComponent: () => {
    return <NotFound>Category not found</NotFound>;
  },
});

function RouteComponent() {
  const { templateId } = Route.useParams();
  const { data: template } = useSuspenseQuery(
    templateQueries.detail(templateId),
  );
  const { data: templates } = useSuspenseQuery(templateQueries.list());

  if (!template) {
    return <NotFound>Category not found</NotFound>;
  }

  return (
    <>
      <div className="w-full md:w-1/5">
        <div
          className="sticky top-0 bg-white p-6 border shadow-md"
          style={{ top: "calc(4rem + 1rem)" }}
        >
          <TemplateEditForm template={template} />
        </div>
      </div>
      <div className="w-full md:w-4/5 relative">
        <TemplateList templates={templates} selectedTemplateId={template.id.toString()} />
      </div>
    </>
  );
}

export function CategoryErrorComponent({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}
