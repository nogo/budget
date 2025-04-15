import { WalletIcon } from "@heroicons/react/24/solid";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/signin")({
  component: SignIn,
});

function SignIn() {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: ({ formApi, value }) => {
      //login(value.email, value.password);
      formApi.reset();
    },
  });

  return (
    <main className="flex justify-center items-center h-screen">
      <div className="md:w-80 md:flex-initial">
        <form
          className="shadow-md p-6 bg-white"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="flex text-yellow-800 justify-center items-center gap-2 text-4xl font-bold capitalize pb-6">
            <WalletIcon className="h-9" />
            <span>Budget</span>
          </div>

          <div className="grid grid-cols-1 gap-y-4">
            <form.Field
              name="email"
              children={(field) => {
                return (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="block text-sm/6 font-medium text-gray-900"
                    >
                      eMail
                    </label>
                    <div className="mt-1">
                      <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-yellow-600">
                        <input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          required
                          className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                        />
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            <form.Field
              name="password"
              children={(field) => {
                return (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="block text-sm/6 font-medium text-gray-900"
                    >
                      Password
                    </label>
                    <div className="mt-1">
                      <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-yellow-600">
                        <input
                          type="password"
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          required
                          className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                        />
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            <div className="mt-6 flex items-center justify-center gap-x-6">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="rounded-full w-full md bg-yellow-800 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-yellow-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 focus-visible:bg-yellow-700"
                    >
                      {isSubmitting ? "..." : "Login"}
                    </button>
                  </>
                )}
              />
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
