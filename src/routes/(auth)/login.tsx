import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { LoaderCircle, Wallet } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button, buttonVariants } from "~/components/ui/button";
import { authClient } from "~/lib/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { env } from "~/lib/env/client";
import { AllowRegistration } from "~/components/auth/allow-registration";
import { useTranslation } from "~/locales/translations";
import { FieldInfo } from "~/components/layout/field-info";

export const Route = createFileRoute("/(auth)/login")({
  component: LoginComponent,
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function LoginComponent() {
  const router = useRouter()
  const queryClient = useQueryClient();
  const t = useTranslation("auth");

  const form = useForm({
    defaultValues: {
      username: env.VITE_AUTH_DEFAULT_USER ?? "",
      password: env.VITE_AUTH_DEFAULT_PASSWORD ?? "",
    },
    onSubmit: async ({ formApi, value }) => {
      const { error, data: response } = await authClient.signIn.username({
        username: value.username,
        password: value.password,
      });

      if (error) {
        return {
          fields: {
            password: error.message
          },
        }
      } else {
        formApi.reset();
        queryClient.resetQueries();
        router.invalidate();
        router.navigate({ to: "/" });
      }

    },
  });

  return (
    <main className="flex justify-center items-center h-screen">
      <div className="md:w-80 md:flex-initial">
        <div className="flex text-yellow-800 justify-center items-center gap-2 text-4xl font-bold capitalize pb-6">
          <Wallet />
          <span>Budget</span>
        </div>

        <form
          className="shadow-md rounded-2xl p-6 bg-white grid grid-cols-1 gap-y-4"
          method="POST"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="username"
            children={(field) => {
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor={field.name}>{t("username")}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          />

          <form.Field
            name="password"
            children={(field) => {
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor={field.name}>{t("password")}</Label>
                  <Input
                    type="password"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          />

          {/* Error Display */}
          {form.state.errors && form.state.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-red-800 font-medium">
                {form.state.errors.join(', ')}
              </div>
            </div>
          )}

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full md bg-yellow-800"
              >
                {isSubmitting ? <LoaderCircle /> : t("login")}
              </Button>
            )}
          />
        </form>
        <AllowRegistration>
          <div className="p-4 text-center">
            <Link to="/join" className={buttonVariants({ variant: "ghost" })}>
              {t("join")}
            </Link>
          </div>
        </AllowRegistration>
      </div>
    </main>
  );
}