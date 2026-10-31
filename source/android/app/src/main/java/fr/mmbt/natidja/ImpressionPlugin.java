package fr.mmbt.natidja;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Impression native : dans l'application, window.print() de la page ne fait
 * rien (le navigateur intégré ne l'implémente pas). Ce petit module ouvre le
 * service d'impression d'Android (qui propose aussi « Enregistrer au format
 * PDF »). Le document imprimé est la page affichée, mise en forme par la
 * feuille de style « impression » déjà présente dans l'application.
 */
@CapacitorPlugin(name = "ImpressionNative")
public class ImpressionPlugin extends Plugin {

    @PluginMethod
    public void imprimer(PluginCall appel) {
        final String nom = appel.getString("nom", "Attestation");
        // Les opérations sur la vue web doivent se faire sur le fil principal.
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager gestionnaire =
                    (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                WebView vue = getBridge().getWebView();
                PrintDocumentAdapter adaptateur = vue.createPrintDocumentAdapter(nom);
                gestionnaire.print(nom, adaptateur, new PrintAttributes.Builder().build());
                appel.resolve();
            } catch (Exception e) {
                appel.reject("Impression impossible : " + e.getMessage());
            }
        });
    }
}
