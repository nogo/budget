import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { templateQueries } from "~/service/queries";
import TemplateAddForm from "~/components/templates/template-add-form";
import TemplateList from "~/components/templates/template-list";

export const Route = createFileRoute("/_app/templates/")({
  component: RouteComponent,
  loader: async ({ context }) =>
    await context.queryClient.ensureQueryData(templateQueries.list()),
});

function RouteComponent() {
  const { data: templates } = useSuspenseQuery(templateQueries.list());

  return (
    <>
      <div className="w-full md:w-1/5">
        <div
          className="sticky top-0 bg-white p-6 border shadow-md"
          style={{ top: "calc(4rem + 1rem)" }}
        >
          <TemplateAddForm />
        </div>
      </div>
      <div className="w-full md:w-4/5 relative">
        <TemplateList templates={templates} />
      </div>
    </>
  );
}
