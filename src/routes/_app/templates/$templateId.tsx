import {
  ErrorComponent,
  ErrorComponentProps,
  createFileRoute,
} from "@tanstack/react-router";
import { NotFound } from "~/components/layout/not-found";
import { templateQueries } from "~/service/queries";
import TemplateEditForm from "~/components/templates/template-edit-form";
import TemplateList from "~/components/templates/template-list";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/templates/$templateId")({
  component: RouteComponent,
  loader: async ({ params: { templateId }, context }) => {
    // Validate templateId parameter before using it
    const numericId = Number(templateId);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error(`Invalid template ID: ${templateId}`);
    }

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
