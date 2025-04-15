import { useForm } from '@tanstack/react-form';

export const SignIn = () => {

  const form = useForm({
    defaultValues: {
      email: '',
      password: ''
    },
    onSubmit: ({ formApi, value }) => {
//      login(value.email, value.password);
    }
  });


  return (
    <div className="md:w-80 md:flex-initial">
      <form
        className="border border-gray-300 shadow-md p-6 bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="grid grid-cols-1 gap-y-6">
          <form.Field
            name="email"
            children={(field) => {
              return (
                <div>
                  <label htmlFor={field.name} className="block text-sm/6 font-medium text-gray-900">
                    Amount
                  </label>
                  <div className="mt-2">
                    <div className="flex items-center bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600">
                      <input
                        type="number"
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="0.00"
                        required
                        className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <div className="mt-6 flex items-center justify-end gap-x-6">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-full md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 focus-visible:bg-green-700"
                  >
                    {isSubmitting ? '...' : 'Login'}
                  </button>
                </>
              )}
            />
          </div>
        </div>
      </form>
    </div>
  );
};