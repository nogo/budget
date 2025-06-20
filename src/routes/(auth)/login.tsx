import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Wallet } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button, buttonVariants } from "~/components/ui/button";
import { authClient } from "~/lib/auth/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { env } from "~/lib/env";
import { LogInSchema } from "~/service/auth.schema";
import { AllowRegistration } from "~/components/auth/allow-registration";
import { useTranslation } from "~/locales/translations";

export const Route = createFileRoute("/(auth)/login")({
  component: Login,
  beforeLoad: async ({ context }) => {
    if (context.userSession) {
      throw redirect({ to: "/" });
    }
  },
});

function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useTranslation("auth");

  const logInMutation = useMutation({
    mutationFn: logIn,
    onSuccess: (response) => {
      queryClient.resetQueries();
      navigate({ to: "/" });
    },
  });

  const form = useForm({
    defaultValues: {
      username: env.PUBLIC_AUTH_DEFAULT_USER ?? "",
      password: env.PUBLIC_AUTH_DEFAULT_PASSWORD ?? "",
    },
    onSubmit: async ({ formApi, value }) => {
      await logInMutation.mutateAsync(value);
      formApi.reset();
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
                </div>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full md bg-yellow-800"
              >
                {isSubmitting ? "..." : t("login")}
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

const logIn = async (data: LogInSchema) => {
  const { error, data: response } = await authClient.signIn.username({
    username: data.username,
    password: data.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return response;
};
