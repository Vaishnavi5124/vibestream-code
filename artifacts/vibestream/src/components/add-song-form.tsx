import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddSong, getListSongsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { extractYoutubeId } from "@/lib/youtube";
import { Plus, Disc, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  youtubeUrl: z.string().url("Must be a valid URL").refine((val) => extractYoutubeId(val) !== null, {
    message: "Must be a valid YouTube URL",
  }),
  title: z.string().max(100, "Song title is too long").optional(),
  addedBy: z.string().min(1, "Name is required").max(50, "Name is too long"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddSongForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      youtubeUrl: "",
      title: "",
      addedBy: "",
    },
  });

  const addSongMutation = useAddSong({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        form.reset();
        toast({
          title: "Track added",
          description: "Your song has been added to the queue.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Could not add song. Try again.",
          variant: "destructive",
        });
      }
    }
  });

  const onSubmit = (values: FormValues) => {
    addSongMutation.mutate({
      data: {
        youtubeUrl: values.youtubeUrl,
        title: values.title?.trim() || undefined,
        addedBy: values.addedBy,
      }
    });
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Disc className="w-5 h-5 animate-spin-slow" style={{ animationDuration: '3s' }} />
          <CardTitle className="text-xl">Drop a track</CardTitle>
        </div>
        <CardDescription>Add a YouTube URL to the shared queue</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="youtubeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Paste YouTube link here..." 
                      className="bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/50 transition-all"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Song title"
                      className="bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/50 transition-all"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addedBy"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Your name" 
                      className="bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/50 transition-all"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium group transition-all"
              disabled={addSongMutation.isPending}
            >
              {addSongMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2 group-hover:scale-125 transition-transform" />
              )}
              Add to queue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
