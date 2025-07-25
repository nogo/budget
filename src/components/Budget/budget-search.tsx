import { useForm } from "@tanstack/react-form";
import { ArrowRight, Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "~/locales/translations";
import { useNavigate } from "@tanstack/react-router";
import { Spinner } from "../Loader";

interface SearchFormProps {
  query?: string
}

const SearchForm: React.FC<SearchFormProps> = ({ query }) => {
  const t = useTranslation("budget");
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      query: query ?? ""
    },
    onSubmit: async ({ value }) => {
      navigate({
        search: { q: value.query || undefined },
        replace: true,
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="relative"
    >
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <Search />
      </div>
      <form.Field
        name="query"
        children={(field) => {
          return (
            <input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-9 pr-16 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          );
        }}
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
        <form.Subscribe
          selector={(state) => state.values.query}
          children={(query) => (

            <Button
              onClick={() => { form.setFieldValue("query", ""); form.handleSubmit() }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>

          )}
        />

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button variant="ghost" type="submit" disabled={!canSubmit}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none">
              {isSubmitting ? <Spinner /> : <ArrowRight />}
            </Button>
          )}
        />
      </div >

    </form >
  );
};

export default SearchForm;